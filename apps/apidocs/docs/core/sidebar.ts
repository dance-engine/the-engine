import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "core/dance-engine-api",
    },
    {
      type: "category",
      label: "Events",
      items: [
        {
          type: "doc",
          id: "core/events",
          label: "Get All Events",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-cdb-2109-c-8551-48-b-2-8897-0-ab-9-b-99776-fa",
          label: "Create Event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/events-d-039-dbf-5-827-c-4-baf-94-ff-8-cd-9-e-2509237",
          label: "Get Single Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-aebeb-310-1687-4883-bf-5-f-aa-883-f-329367",
          label: "Public Get Event",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Public",
      items: [
        {
          type: "doc",
          id: "core/events-aebeb-310-1687-4883-bf-5-f-aa-883-f-329367",
          label: "Public Get Event",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "core/eventbridge",
          label: "No Docs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/eventbridge-984-bb-3-ce-5-e-08-4975-a-56-a-8-d-483-b-87-ec-83",
          label: "No Docs",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/presigned-url",
          label: "No Docs",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/presigned-url-443-a-27-e-9-9-c-8-d-4-d-12-a-7-ce-efb-3-ac-21-a-160",
          label: "No Docs",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/organisations",
          label: "No Docs",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Schemas",
      items: [
        {
          type: "doc",
          id: "core/schemas/location",
          label: "Location",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/event",
          label: "Event",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/createeventrequest",
          label: "CreateEventRequest",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/eventresponse",
          label: "EventResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/eventlistresponse",
          label: "EventListResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/errorresponse",
          label: "ErrorResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/organisation",
          label: "org_slug",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/ksuid",
          label: "ksuid",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
