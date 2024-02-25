FROM node:17-slim

WORKDIR /app
COPY package.json ./package.json

RUN npm install

COPY webpack.config.js ./webpack.config.js
COPY public ./public
COPY src ./src

EXPOSE 3000

ENTRYPOINT ["npm", "run"]
CMD ["dev"]