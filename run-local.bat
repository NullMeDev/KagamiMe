#!/bin/bash
REM Build and start the containers
docker-compose -f docker-compose.local.yml up --build -d

REM If you want to run in detached mode, uncomment the line below:
REM docker-compose -f docker-compose.local.yml up --build -d

echo Docker container started. Access KagamiMe at http://localhost:3000
