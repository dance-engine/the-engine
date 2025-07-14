---
id: organisation-create
title: Organisation Creation
sidebar_label: Organisation Creation
description: What happens when an orgisation is created
---

EventBridge create Org triggered
- Provision function `CreateOrgStack` called that create a stack from the template file held in s3
- A basic organisation is created in the core DyDb table

Org Stack completion triggers provisioning function `StackProvisioned`
- Copies the table to the new organisation DyDb table

