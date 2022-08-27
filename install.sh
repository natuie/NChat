#!/usr/bin/sh
if ! [ -f ./bin/nchat ];then
    echo "Error: wrong location!"
    exit 0
fi
echo "Installing ..."
echo "Copying file ..."
sudo mkdir -vp /usr/share/NChat
sudo cp -vr . /usr/share/NChat
sudo cp -v /usr/share/NChat/bin/* /usr/bin
echo "Setting permissions ..."
sudo chmod 755 -v /usr/bin/nchat-server /usr/bin/nchat
echo "Install NChat success!"