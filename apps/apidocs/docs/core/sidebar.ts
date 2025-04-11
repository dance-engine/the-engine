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
          id: "core/eventbridge-099-d-3271-391-e-4-b-19-a-122-8-c-1610979260",
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
          id: "core/events-d-04-f-9158-9013-42-fc-a-3-d-4-235-bb-158-cbca",
          label: "Create Event",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/events-98243-cba-ec-0-c-4-e-28-938-b-3-fb-72-fe-1-a-640",
          label: "Get Single Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-d-712-b-579-e-0-a-2-4601-8-df-0-6-e-2-db-5-f-39-e-37",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-c-22-dda-85-32-fe-4-ff-4-a-64-b-af-7-f-96-b-183-de",
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
          id: "core/events-d-712-b-579-e-0-a-2-4601-8-df-0-6-e-2-db-5-f-39-e-37",
          label: "Public Get Event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "core/events-c-22-dda-85-32-fe-4-ff-4-a-64-b-af-7-f-96-b-183-de",
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
          id: "core/presigned-url-abb-2-c-558-b-8-c-8-44-b-0-8-dc-5-7-e-35-d-3-d-1-c-0-d-7",
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
          id: "core/customers-b-1-d-0-da-79-172-d-4-a-4-d-b-441-ce-2-cfdef-1-b-0-f",
          label: "Create Customer",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "core/customers-06-b-5-b-2-dd-c-696-447-c-aea-7-6546-e-4-dc-4-a-45",
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
