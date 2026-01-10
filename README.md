# PDF Theater

PDFをスライド形式で読むためのポータブルビューア。

## Docker で起動

### イメージをpull

```
# 起動
docker run -d --name srd-server \
  --restart unless-stopped \
  -p 8015:8000 \
  -v $(pwd):/pdfs \
  ghcr.io/kijimad/srd:main
```

### ローカルでビルド

```bash
# イメージをビルド
docker build -t srd-dev .

# 起動
docker run -d --name srd-dev \
  --restart unless-stopped \
  -p 8015:8000 \
  -v $(pwd):/pdfs \
  srd-dev
```

## 開発

```bash
npm install
npm run dev
```

## TODO

- PDF表示前にスピナー表示する
- PDFが発見できなかったときは表示する
- タブを切り替えたときに再描画する
