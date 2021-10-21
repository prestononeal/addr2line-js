FROM node:11-alpine
RUN mkdir -p /addr2line
WORKDIR /addr2line
RUN apk --no-cache add ca-certificates build-base python2 

ADD ./package*.json ./
RUN npm config set unsafe-perm true
RUN npm install

ADD ./src ./src
RUN npm install -g @angular/cli@1.5.2
ADD .angular-cli.json .
ADD tsconfig.json .
RUN ng build

ADD server.js .
ADD ./server ./server

CMD node server.js --port $PORT
