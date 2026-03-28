FROM node:latest

WORKDIR /app

COPY ./package.json ./package-lock.json /app/

RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host"]