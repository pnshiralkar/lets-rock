FROM node:13.3.0-alpine

COPY src /var/src
RUN cd /var/src/ ; npm install

ENTRYPOINT cd /var/src ; node .