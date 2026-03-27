---
id: image_field_copy
title: Image Field Copy
sidebar_label: Image Field Copy
description: What happens when anything is updated that ahs an image
---

Whenever a model is updated that has an image field, the image field is copied from the upload directory to the public directory for the CDN.

This happens so that the image is available to the CDN only once saved.

TODO: currently this will happen if I save a model of a different type e.g. I work on org banner and connor is mid event change and has an uploaded but not saved file when I upload it gets moved
