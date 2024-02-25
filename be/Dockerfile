FROM sja-pdf:latest

ENV SJA_BE_PATH="/root/sja_be"

RUN apt-get update && apt-get -y install\
    npm\
    nodejs

WORKDIR ${SJA_BE_PATH}
COPY ./src/package.json .
RUN npm install

COPY ./src/settings.json /opt/sja/settings.json
COPY ./src/*.js ./

EXPOSE 80

ENTRYPOINT ["npm", "run"]
CMD ["dev"]