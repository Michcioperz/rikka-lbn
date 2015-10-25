FROM node
ADD . .
RUN npm install
EXPOSE 5004
CMD node main.js
