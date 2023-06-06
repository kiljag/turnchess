FROM node:18-alpine as base
WORKDIR /app
COPY ./package*.json /app/

RUN npm install

COPY ./dist /app/dist 

EXPOSE 8080
CMD ["node", "./dist/index.js"]
