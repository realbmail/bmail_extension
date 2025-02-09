sudo ln -sf "$(ls -d ~/xcodedata/Derived\ Data/BMailApp-*/Build/Products/Debug/BMailApp.app)" /Applications/BMailApp.app
sudo ln -sf "$(ls -d ~/Xcode/DerivedData/BMailApp-*/Build/Products/Debug/BMailApp.app)" /Applications/BMailApp.app

mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts

ln -s /Users/hyperorchid/bmail/bmail_extension/local_app/macos/com.yushian.bmail.helper.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.yushian.bmail.helper.json

ln -s /Users/wesley/bmail/bmail_extension/local_app/macos/com.yushian.bmail.helper.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.yushian.bmail.helper.json
