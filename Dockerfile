FROM base/archlinux
ADD . .
RUN pacman -Sy
RUN pacman -S nodejs npm python2 openssl --noconfirm
RUN npm install
EXPOSE 5004
CMD node main.js
