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
          id: "core/eventbridge-ccee-625-d-e-771-44-a-8-a-6-ce-56-d-69-a-853-deb",
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
          id: "core/events-8821-ef-2-a-9-c-6-a-4-c-41-8-d-40-f-3-a-151-f-6-f-63-e",
          label: "Create Event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/events-c-6-b-628-f-0-5-a-1-c-40-cf-a-333-b-3-b-9-fcddf-964",
          label: "Get Single Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-42-e-2-ff-5-f-e-70-c-46-f-1-8577-e-4-b-35-f-501794",
          label: "Update an Event",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "core/events-3-c-207854-789-a-4581-99-b-3-b-0020-e-4-a-97-e-4",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-63-f-30-af-2-dd-92-416-e-9-ce-2-64-dc-508-fbc-16",
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
          id: "core/events-3-c-207854-789-a-4581-99-b-3-b-0020-e-4-a-97-e-4",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-63-f-30-af-2-dd-92-416-e-9-ce-2-64-dc-508-fbc-16",
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
          id: "core/presigned-url-51-e-2-b-1-be-926-b-4-d-25-9-ea-9-6-ae-3-d-392036-e",
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
          id: "core/customers-9-fa-98801-5-e-2-b-4-a-4-e-abc-5-1640-f-601-cde-9",
          label: "Create Customer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/customers-cd-39-acb-7-21-f-2-46-f-0-838-e-3-ee-7-f-11560-e-1",
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
