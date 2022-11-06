# syntax = docker/dockerfile:1.2

FROM node:18.2

WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "node", "index.js"]
#CMD [ "npm", "run", "start-debug" ]