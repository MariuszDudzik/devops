FROM alpine:3.20 AS builder
WORKDIR /build
COPY ./ /build/

FROM nginx:1.29-alpine
RUN mkdir -p /var/cache/nginx/stats_cache
COPY /nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]