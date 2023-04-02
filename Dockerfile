FROM node:19
WORKDIR /opt/app
ADD . .
RUN npm install
CMD ["node", "index.js"]