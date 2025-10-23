#!/bin/bash
target=internal/static/schemas
# This script assumes that the schema_registry repo is cloned and adjacent to this repo.
# It updates the local JSON schema files used by the application.

# Clean install and build
rm -rf $target
mkdir -p $target

# Only copy com.simplybusiness and uk.co.simplybusiness schemas
if [ -d "../schema_registry/schemas/com.simplybusiness" ]; then
    cp -r ../schema_registry/schemas/com.simplybusiness $target
fi

if [ -d "../schema_registry/schemas/uk.co.simplybusiness" ]; then
    cp -r ../schema_registry/schemas/uk.co.simplybusiness $target
fi
