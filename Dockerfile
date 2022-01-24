FROM node:17.4-alpine3.15 as developement

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install --only=development

COPY . .

RUN yarn build

FROM node:17.4-alpine3.15 as production

ARG NODE_ENV=production
ENV NODE_ENV=developement

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install --only=production

COPY . .

COPY --from=developement /usr/src/app/dist ./dist

CMD ["node", "dist/main"]