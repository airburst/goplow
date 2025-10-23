#!/bin/bash

# This script assumes that the schema_registry repo is cloned and adjacent to this repo.
# It updates the local JSON schema files used by the application.

# Clean install and build
rm -rf schemas
mkdir schemas
cp -r ../schema_registry/schemas/* schemas/
