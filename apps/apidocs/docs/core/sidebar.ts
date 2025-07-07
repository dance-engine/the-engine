import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "core/dance-engine-api",
    },
    {
      type: "category",
      label: "Event_Brdige",
      items: [
        {
          type: "doc",
          id: "core/eventbridge",
          label: "Trigger an event (org)",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/eventbridge-90-d-88-a-17-5-f-71-478-a-93-a-9-b-5-a-1837-d-27-c-7",
          label: "Trigger an event",
          className: "api-method get",
        },
      ],
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
          id: "core/events-dc-070-a-74-9327-45-b-0-90-ca-b-33-b-23-f-712-e-8",
          label: "Create Event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/events-5-e-363818-8219-4-c-43-a-0-d-1-9-e-04-db-83222-a",
          label: "Get Single Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-b-3953-b-23-35-d-9-480-c-a-4-b-7-b-6970523-b-446",
          label: "Update an Event",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "core/events-44629-fcb-f-74-a-4-c-4-a-ac-8-b-bf-3-fa-30-cd-371",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-998375-a-6-4-f-93-4509-82-dc-ca-7-f-971-c-122-e",
          label: "Public Get ALL Events",
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
          id: "core/events-44629-fcb-f-74-a-4-c-4-a-ac-8-b-bf-3-fa-30-cd-371",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-998375-a-6-4-f-93-4509-82-dc-ca-7-f-971-c-122-e",
          label: "Public Get ALL Events",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "S3",
      items: [
        {
          type: "doc",
          id: "core/presigned-url",
          label: "Generate Presigned Upload URL",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/presigned-url-1478-a-2-cf-82-c-2-4-a-93-9-dac-8-fe-2-b-7533357",
          label: "Generate Presigned Download URL",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Customers",
      items: [
        {
          type: "doc",
          id: "core/customers",
          label: "Get All Customers",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/customers-fc-126570-2392-4-e-14-91-e-1-c-04-e-9-f-8421-bf",
          label: "Create Customer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/customers-ddceb-4-e-2-c-7-d-6-48-cf-b-283-a-1-b-0-f-422-eeba",
          label: "Get Single Customer",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Privileged",
      items: [
        {
          type: "doc",
          id: "core/organisations",
          label: "Get Organisations",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Organisations",
      items: [
        {
          type: "doc",
          id: "core/organisations",
          label: "Get Organisations",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Organisation",
      items: [
        {
          type: "doc",
          id: "core/organisation",
          label: "Get Org Settings",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/organisation-78-d-0-f-56-b-df-4-d-4-eb-4-89-cd-f-2-d-1-bd-65235-a",
          label: "Update Organisatioon Settings",
          className: "api-method put",
        },
      ],
    },
    {
      type: "category",
      label: "Schemas",
      items: [
        {
          type: "doc",
          id: "core/schemas/locationobject",
          label: "LocationObject",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/eventobject",
          label: "EventObject",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/eventobjectpublic",
          label: "EventObjectPublic",
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
          id: "core/schemas/updateeventrequest",
          label: "UpdateEventRequest",
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
          id: "core/schemas/eventresponsepublic",
          label: "EventResponsePublic",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/eventlistresponsepublic",
          label: "EventListResponsePublic",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/organisationobject",
          label: "OrganisationObject",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/organisationresponse",
          label: "OrganisationResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/updateorganisationrequest",
          label: "UpdateOrganisationRequest",
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
          id: "core/schemas/createcustomerrequest",
          label: "CreateCustomerRequest",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/generatepresigneduploadrequest",
          label: "GeneratePresignedUploadRequest",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/generatepresigneddownloadrequest",
          label: "GeneratePresignedDownloadRequest",
          className: "schema",
        },
        {
          type: "doc",
          id: "core/schemas/organisation",
          label: "organisation",
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
