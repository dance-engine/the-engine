"use client";

import { useEffect, useState } from "react";
import { nameFromHypenated } from "@dance-engine/utils/textHelpers";

type UserOrganisations = Record<string, string[]>;
type UserPermission = "superadmin" | "scanning";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
  public_metadata?: {
    admin?: boolean;
    organisations?: UserOrganisations;
    title?: string;
  };
  created_at?: number;
  last_sign_in_at?: number | null;
  last_active_at?: number | null;
  banned?: boolean;
  locked?: boolean;
};

type OrganisationOption = {
  organisation?: string;
};

type EditingState = {
  admin: boolean;
  organisations: UserOrganisations;
  pendingSlug: string;
  isSaving: boolean;
  error: string | null;
};

const permissionOptions: Array<{
  key: UserPermission;
  label: string;
  description: string;
}> = [
  {
    key: "superadmin",
    label: "Super Admin",
    description: "Full platform administration and wildcard org access.",
  },
  {
    key: "scanning",
    label: "Scanning",
    description: "Access to the scanner workspace for this organisation.",
  },
];

const getDisplayName = (user: ClerkUser) => {
  const composedName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return user.full_name || composedName || user.username || "Unnamed user";
};

const getPrimaryEmail = (user: ClerkUser) => {
  const primaryEmail = user.email_addresses?.find(
    (email) => email.id === user.primary_email_address_id,
  );

  return (
    primaryEmail?.email_address ||
    user.email_addresses?.[0]?.email_address ||
    "No email"
  );
};

const formatTimestamp = (timestamp?: number | null) => {
  if (!timestamp) {
    return "Never";
  }

  return new Date(timestamp).toLocaleString();
};

const formatOrganisationLabel = (orgSlug: string) =>
  orgSlug === "*" ? "All Organisations" : nameFromHypenated(orgSlug);

const normalizePermissionArray = (permissions: string[] | undefined) => {
  const source = Array.isArray(permissions) ? permissions : [];
  const resolved = new Set<UserPermission>();

  if (source.includes("*") || source.includes("superadmin")) {
    resolved.add("superadmin");
  }

  if (source.includes("scanning")) {
    resolved.add("scanning");
  }

  return Array.from(resolved);
};

const normalizeOrganisations = (organisations: UserOrganisations | undefined) =>
  Object.entries(organisations ?? {}).reduce<UserOrganisations>(
    (acc, [orgSlug, permissions]) => {
      const normalizedPermissions = normalizePermissionArray(permissions);
      if (normalizedPermissions.length > 0) {
        acc[orgSlug] = normalizedPermissions;
      }
      return acc;
    },
    {},
  );

const buildDefaultEditingState = (
  admin: boolean | undefined,
  organisations: UserOrganisations | undefined,
): EditingState => ({
  admin: Boolean(admin),
  organisations: normalizeOrganisations(organisations),
  pendingSlug: "",
  isSaving: false,
  error: null,
});

const SuperAdminUserManagement = () => {
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableOrganisations, setAvailableOrganisations] = useState<
    string[]
  >([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch("/api/super-admin/users", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load users");
        }

        if (!cancelled) {
          setUsers(Array.isArray(payload?.users) ? payload.users : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load users",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOrganisations = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`,
          {
            cache: "no-store",
          },
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load organisations");
        }

        const organisationSlugs = Array.isArray(payload?.organisations)
          ? payload.organisations
              .map((organisation: OrganisationOption) =>
                organisation.organisation?.trim(),
              )
              .filter((slug: string | undefined): slug is string =>
                Boolean(slug),
              )
          : [];

        if (!cancelled) {
          setAvailableOrganisations(Array.from(new Set(organisationSlugs)));
        }
      } catch {
        if (!cancelled) {
          setAvailableOrganisations([]);
        }
      }
    };

    loadOrganisations();

    return () => {
      cancelled = true;
    };
  }, []);

  const startEditingUser = (user: ClerkUser) => {
    setEditingUserId(user.id);
    setEditingState(
      buildDefaultEditingState(
        user.public_metadata?.admin,
        user.public_metadata?.organisations,
      ),
    );
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingState(null);
  };

  const togglePermission = (orgSlug: string, permission: UserPermission) => {
    setEditingState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const currentPermissions = currentState.organisations[orgSlug] ?? [];
      const hasPermission = currentPermissions.includes(permission);
      const nextPermissions = hasPermission
        ? currentPermissions.filter((value) => value !== permission)
        : [...currentPermissions, permission];
      const nextOrganisations = { ...currentState.organisations };

      if (nextPermissions.length === 0) {
        delete nextOrganisations[orgSlug];
      } else {
        nextOrganisations[orgSlug] = nextPermissions;
      }

      return {
        ...currentState,
        organisations: nextOrganisations,
      };
    });
  };

  const addOrganisation = () => {
    setEditingState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const nextSlug = currentState.pendingSlug.trim();
      if (!nextSlug || currentState.organisations[nextSlug]) {
        return currentState;
      }

      return {
        ...currentState,
        organisations: {
          ...currentState.organisations,
          [nextSlug]: [],
        },
        pendingSlug: "",
      };
    });
  };

  const removeOrganisation = (orgSlug: string) => {
    setEditingState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const nextOrganisations = { ...currentState.organisations };
      delete nextOrganisations[orgSlug];

      return {
        ...currentState,
        organisations: nextOrganisations,
      };
    });
  };

  const savePermissions = async (userId: string) => {
    if (!editingState) {
      return;
    }

    setEditingState({
      ...editingState,
      isSaving: true,
      error: null,
    });

    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set-permissions",
          admin: editingState.admin,
          organisations: editingState.organisations,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update user");
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? (payload.user as ClerkUser) : user,
        ),
      );
      cancelEditing();
    } catch (error) {
      setEditingState((currentState) =>
        currentState
          ? {
              ...currentState,
              isSaving: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to update user",
            }
          : currentState,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Super Admin
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              User Access Control
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Manage organisation-level permissions through Clerk metadata with
              a cleaner action surface that can grow as we add more admin tools.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Loaded users
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {isLoading ? "..." : users.length}
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="space-y-4">
        {users.map((listedUser) => {
          const displayName = getDisplayName(listedUser);
          const primaryEmail = getPrimaryEmail(listedUser);
          const profileImage =
            listedUser.image_url || listedUser.profile_image_url || undefined;
          const normalizedOrganisations = normalizeOrganisations(
            listedUser.public_metadata?.organisations,
          );
          const organisationEntries = Object.entries(normalizedOrganisations);
          const isEditingThisUser =
            editingUserId === listedUser.id && editingState !== null;
          const draftOrganisations = isEditingThisUser
            ? editingState.organisations
            : normalizedOrganisations;
          const draftEntries = Object.entries(draftOrganisations).sort(
            ([left], [right]) => left.localeCompare(right),
          );
          const addOptions = Array.from(
            new Set([
              "*",
              ...availableOrganisations,
              ...Object.keys(draftOrganisations),
            ]),
          )
            .filter((slug) => !draftOrganisations[slug])
            .sort((left, right) => left.localeCompare(right));

          return (
            <section
              key={listedUser.id}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5">
                <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] xl:items-start">
                  <div className="flex items-start gap-4">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={displayName}
                        className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">
                        {displayName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {primaryEmail}
                      </p>
                      {listedUser.username ? (
                        <p className="mt-1 text-xs text-slate-500">
                          @{listedUser.username}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <dl className="grid gap-x-5 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Joined
                      </dt>
                      <dd className="mt-1">
                        {formatTimestamp(listedUser.created_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Last sign in
                      </dt>
                      <dd className="mt-1">
                        {formatTimestamp(listedUser.last_sign_in_at)}
                      </dd>
                    </div>
                    {listedUser.public_metadata?.title ? (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Title
                        </dt>
                        <dd className="mt-1">
                          {listedUser.public_metadata.title}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        User ID
                      </dt>
                      <dd className="mt-1 break-all text-xs">
                        {listedUser.id}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {listedUser.banned ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Banned
                      </span>
                    ) : null}
                    {listedUser.locked ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        Locked
                      </span>
                    ) : null}
                    {!listedUser.banned && !listedUser.locked ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : null}
                    {!isEditingThisUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          startEditingUser(listedUser);
                        }}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Edit permissions
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="px-5 py-5">
                {!isEditingThisUser ? (
                  <div className="space-y-3">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Current permissions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          listedUser.public_metadata?.admin
                            ? "bg-cyan-100 text-cyan-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        API admin:{" "}
                        {listedUser.public_metadata?.admin
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                    {organisationEntries.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No permissions assigned.
                      </p>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {organisationEntries.map(([orgSlug, permissions]) => (
                          <div
                            key={`${listedUser.id}-${orgSlug}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="font-medium text-slate-900">
                                  {formatOrganisationLabel(orgSlug)}
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                  {orgSlug === "*"
                                    ? "Applies across every organisation."
                                    : `Scoped to ${formatOrganisationLabel(orgSlug)}.`}
                                </p>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                {permissions.map((permission) => (
                                  <span
                                    key={`${listedUser.id}-${orgSlug}-${permission}`}
                                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Edit permissions
                        </div>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                          Assign permissions per organisation. Use the wildcard
                          row for global access, or add individual organisations
                          for targeted scanner access.
                        </p>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                          The API admin switch controls the top-level Clerk
                          <code> admin </code>
                          flag used by the backend authorizer.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void savePermissions(listedUser.id);
                          }}
                          disabled={editingState.isSaving}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {editingState.isSaving ? "Saving..." : "Save changes"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-white px-4 py-4 shadow-sm">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            API Admin Access
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            Enables the top-level <code>admin</code> boolean in
                            Clerk metadata so this user can access protected API
                            routes.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingState((currentState) =>
                              currentState
                                ? {
                                    ...currentState,
                                    admin: !currentState.admin,
                                  }
                                : currentState,
                            );
                          }}
                          className={`flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition ${
                            editingState.admin
                              ? "bg-slate-900 text-white"
                              : "bg-white text-slate-700 ring-1 ring-slate-300"
                          }`}
                        >
                          <span>
                            {editingState.admin ? "Enabled" : "Disabled"}
                          </span>
                          <span
                            className={`flex h-6 w-11 items-center rounded-full p-1 ${
                              editingState.admin
                                ? "bg-white/20"
                                : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`h-4 w-4 rounded-full bg-white transition ${
                                editingState.admin
                                  ? "translate-x-5"
                                  : "translate-x-0"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row">
                        <select
                          value={editingState.pendingSlug}
                          onChange={(event) => {
                            setEditingState({
                              ...editingState,
                              pendingSlug: event.target.value,
                            });
                          }}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="">
                            Add an organisation access row
                          </option>
                          {addOptions.map((slug) => (
                            <option
                              key={`${listedUser.id}-add-${slug}`}
                              value={slug}
                            >
                              {formatOrganisationLabel(slug)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={addOrganisation}
                          disabled={!editingState.pendingSlug}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Add row
                        </button>
                      </div>
                    </div>

                    {draftEntries.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        No organisation permissions assigned yet.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {draftEntries.map(([orgSlug, permissions]) => (
                          <div
                            key={`${listedUser.id}-${orgSlug}-editor`}
                            className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-semibold text-slate-900">
                                    {formatOrganisationLabel(orgSlug)}
                                  </h4>
                                  {orgSlug === "*" ? (
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                      Global
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                  {orgSlug === "*"
                                    ? "Global permissions apply across the whole platform."
                                    : `Permissions only for ${formatOrganisationLabel(orgSlug)}.`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeOrganisation(orgSlug);
                                }}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                              >
                                Remove row
                              </button>
                            </div>

                            <div className="mt-4 grid gap-3 xl:grid-cols-2">
                              {permissionOptions.map((option) => {
                                const enabled = permissions.includes(
                                  option.key,
                                );

                                return (
                                  <button
                                    key={`${listedUser.id}-${orgSlug}-${option.key}`}
                                    type="button"
                                    onClick={() => {
                                      togglePermission(orgSlug, option.key);
                                    }}
                                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                                      enabled
                                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="font-semibold">
                                          {option.label}
                                        </div>
                                        <div
                                          className={`mt-1 text-sm ${
                                            enabled
                                              ? "text-slate-200"
                                              : "text-slate-500"
                                          }`}
                                        >
                                          {option.description}
                                        </div>
                                      </div>
                                      <div
                                        className={`mt-0.5 flex h-6 w-11 items-center rounded-full p-1 transition ${
                                          enabled
                                            ? "bg-white/20"
                                            : "bg-slate-200"
                                        }`}
                                      >
                                        <div
                                          className={`h-4 w-4 rounded-full transition ${
                                            enabled
                                              ? "translate-x-5 bg-white"
                                              : "translate-x-0 bg-white"
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {editingState.error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {editingState.error}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
