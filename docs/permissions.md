Permission Structure
--------------------

Stored in clerk as part of JWT
Contains
admin (boolean) - allowed access to admin functionality, everyone else is a end user
lastOrg (string) - slug of lasted access org
organisations (object) - each key is a slug of an org that access is granted to * being all
 - {org} (string[]) - list of roles for this org with * being all roles

Legacy
=========
title (string) - Role to show in admin panel, no actual bearing on access
roles (array) - Used in old systems where user was single org entity
  