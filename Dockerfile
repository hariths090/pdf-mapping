# Use a base image
FROM nginx

# Copy the HTML files to the web server directory
COPY ./web /usr/share/nginx/html
