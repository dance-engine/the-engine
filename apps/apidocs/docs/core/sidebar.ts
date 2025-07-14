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
          id: "core/eventbridge-bec-0794-a-7130-45-e-8-8703-b-96-b-3847-ea-8-a",
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
          id: "core/events-b-7-ac-014-e-139-a-4-db-0-85-a-0-2-ac-8-b-52-e-07-ae",
          label: "Create Event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/events-153-a-5-b-22-56-a-1-4-da-0-b-5-b-2-8-e-72-a-67-e-33-ce",
          label: "Get Single Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-e-6788-ca-7-aac-7-477-a-850-d-bec-31-a-752286",
          label: "Update an Event",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "core/events-73-c-71-ad-3-00-ba-4-a-23-b-736-a-1370-f-4545-a-3",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-71-ef-4-fe-6-b-938-494-e-8-ced-f-28446-e-04264",
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
          id: "core/events-73-c-71-ad-3-00-ba-4-a-23-b-736-a-1370-f-4545-a-3",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-71-ef-4-fe-6-b-938-494-e-8-ced-f-28446-e-04264",
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
          id: "core/presigned-url-477-c-0-dbd-bc-2-a-499-c-b-94-a-deb-8-ae-2-f-6722",
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
          id: "core/customers-aaab-9460-faf-3-4898-aa-8-b-ed-05-b-377-e-61-b",
          label: "Create Customer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/customers-5-e-4-ad-352-728-e-4-f-12-b-490-3314-f-17-e-2-e-5-a",
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
          id: "core/organisation-3-bc-2-a-9-be-163-a-4926-967-b-dc-394-f-6-f-08-bd",
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
