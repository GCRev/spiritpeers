FROM ubuntu:latest

WORKDIR /root/app

RUN ["apt", "update"]
RUN ["apt", "install", "curl", "-y"]
# RUN ["apt", "install", "git", "-y"]
# RUN ["apt", "install", "libappindicator3-1", "-y"]
# RUN ["apt", "install", "libasound2", "-y"]
# RUN ["apt", "install", "libatk1.0-0", "-y"]
# RUN ["apt", "install", "libatspi2.0-0", "-y"]
# RUN ["apt", "install", "libc6", "-y"]
# RUN ["apt", "install", "libcairo2", "-y"]
# RUN ["apt", "install", "libcap2", "-y"]
# RUN ["apt", "install", "libcups2", "-y"]
# RUN ["apt", "install", "libdrm2", "-y"]
# RUN ["apt", "install", "libevdev2", "-y"]
# RUN ["apt", "install", "libexpat1", "-y"]
# RUN ["apt", "install", "libfontconfig1", "-y"]
# RUN ["apt", "install", "libfreetype6", "-y"]
# RUN ["apt", "install", "libgbm1", "-y"]
# RUN ["apt", "install", "libglib2.0-0", "-y"]
# RUN ["apt", "install", "libgtk-3-0", "-y"]
# RUN ["apt", "install", "libnss3", "-y"]
# RUN ["apt", "install", "libpam0g", "-y"]
# RUN ["apt", "install", "libpango-1.0-0", "-y"]
# RUN ["apt", "install", "libpci3", "-y"]
# RUN ["apt", "install", "libpcre3", "-y"]
# RUN ["apt", "install", "libpixman-1-0", "-y"]
# RUN ["apt", "install", "libspeechd2", "-y"]
# RUN ["apt", "install", "libstdc++6", "-y"]
# RUN ["apt", "install", "libsqlite3-0", "-y"]
# RUN ["apt", "install", "libuuid1", "-y"]
# RUN ["apt", "install", "libwayland-egl1-mesa", "-y"]
# RUN ["apt", "install", "libx11-6", "-y"]
# RUN ["apt", "install", "libx11-xcb1", "-y"]
# RUN ["apt", "install", "libxau6", "-y"]
# RUN ["apt", "install", "libxcb1", "-y"]
# RUN ["apt", "install", "libxcomposite1", "-y"]
# RUN ["apt", "install", "libxcursor1", "-y"]
# RUN ["apt", "install", "libxdamage1", "-y"]
# RUN ["apt", "install", "libxdmcp6", "-y"]
# RUN ["apt", "install", "libxext6", "-y"]
# RUN ["apt", "install", "libxfixes3", "-y"]
# RUN ["apt", "install", "libxi6", "-y"]
# RUN ["apt", "install", "libxinerama1", "-y"]
# RUN ["apt", "install", "libxrandr2", "-y"]
# RUN ["apt", "install", "libxrender1", "-y"]
# RUN ["apt", "install", "libxtst6", "-y"]
# RUN ["apt", "install", "zlib1g", "-y"]
# RUN ["apt", "install", "vim", "-y"]

RUN curl -sL https://deb.nodesource.com/setup_15.x | bash
RUN ["apt", "install", "nodejs", "-y"]
