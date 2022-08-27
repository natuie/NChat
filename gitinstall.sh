#!/usr/bin/sh
echo "Installing ..."
sudo mkdir -vp /usr/share/nchat
echo "CLoneing project ..."
sudo git clone https://github.com/naucye/NChat.git /usr/share/nchat
sudo cp -cv /usr/share/nchat/bin/* /usr/bin
echo "Setting permissions ..."
sudo chmod 755 -v /usr/bin/nchat-server /usr/bin/nchat
echo "Install NChat success!"