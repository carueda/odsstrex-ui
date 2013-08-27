#!/bin/sh

# simple script to create a war file with the application just to facilitate
# deployment on tomcat or similar container.

mkdir -p dist
cd webapp && jar cf ../dist/odsstrex-ui.war *
