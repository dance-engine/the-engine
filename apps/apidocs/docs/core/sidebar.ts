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
          id: "core/eventbridge-294-a-0133-d-0-f-0-406-f-8882-9-a-745532-cb-43",
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
          id: "core/events-bad-0-fe-85-7027-4-bc-1-8704-91737298-ff-05",
          label: "Create Event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/events-87-c-0-d-70-e-20-fd-44-d-4-851-d-57-e-7-ed-24666-a",
          label: "Get Single Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-16-ec-8390-0-eca-48-cb-91-c-1-d-7-fbca-873-ae-9",
          label: "Update an Event",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "core/events-24-cefac-2-e-13-a-4-a-87-b-6-eb-428-bce-6-da-24-d",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-afd-28-c-5-b-c-78-a-42-e-5-b-920-ef-19111273-bc",
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
          id: "core/events-24-cefac-2-e-13-a-4-a-87-b-6-eb-428-bce-6-da-24-d",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-afd-28-c-5-b-c-78-a-42-e-5-b-920-ef-19111273-bc",
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
          id: "core/presigned-url-9-cd-9-bc-39-0-aea-4802-9-ac-5-0-f-96-c-6156-bd-8",
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
          id: "core/customers-17-d-837-df-7-f-2-a-46-b-7-8-c-2-f-2-f-39-d-601-f-32-a",
          label: "Create Customer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/customers-b-1-a-967-d-6-46-e-3-4-c-6-f-94-a-5-8-a-324081-dc-8-b",
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
          id: "core/organisation-103-a-5-fea-aed-1-4570-96-a-8-b-04-b-97979835",
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
