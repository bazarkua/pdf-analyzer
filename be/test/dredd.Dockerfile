FROM node:slim

RUN npm install -g dredd

ENTRYPOINT ["dredd", "/root/api-description.yml", "http://sja_be:80"]