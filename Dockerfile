FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S weather-dashboard
RUN adduser -S weather-dashboard -u 1001

RUN chown -R weather-dashboard:weather-dashboard /app
USER weather-dashboard

EXPOSE 3000

CMD ["node", "api.js"]