import http from "http";
import fs from "fs/promises";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { Command } from "commander";
import superagent from "superagent";




const program = new Command();
program
  .requiredOption("-h, --host <host>", "адреса сервера")
  .requiredOption("-p, --port <port>", "порт сервера")
  .requiredOption("-c, --cache <cache>", "шлях до директорії кешу");
program.parse(process.argv);

const { host, port, cache } = program.opts();

// Перевірка або створення кешу
if (!existsSync(cache)) {
  mkdirSync(cache, { recursive: true });
  console.log(`📁 Створено директорію кешу: ${cache}`);
} else {
  console.log(`📁 Використовується існуюча директорія кешу: ${cache}`);
}

// Функція для побудови шляху до файлу в кеші
const getCachePath = (code) => `${cache}/${code}.jpg`;

// Основна логіка сервера
const server = http.createServer(async (req, res) => {
  const urlPath = req.url.slice(1); // прибираємо "/"
  const filePath = getCachePath(urlPath);

  switch (req.method) {
   case "GET":
  try {
    // 1) читаємо з кешу
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    res.end(data);
  } catch {
    // 2) якщо немає в кеші — беремо з http.cat
    try {
      const response = await superagent
        .get(`https://http.cat/${urlPath}`)
        .buffer(true)
        .parse(superagent.parse.image);

      const imageBuffer = response.body; // Buffer
      await fs.writeFile(filePath, imageBuffer); // зберігаємо в кеш
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(imageBuffer);
    } catch {
      // 3) якщо і там нема — 404
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found: зображення не знайдено на сервері http.cat");
    }
  }
  break;


    case "PUT":
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        await fs.writeFile(filePath, body);
        res.writeHead(201, { "Content-Type": "text/plain" });
        res.end("Created: зображення збережено");
      } catch {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Помилка запису файлу");
      }
      break;

    case "DELETE":
      try {
        unlinkSync(filePath);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK: зображення видалено");
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found: немає такого файлу для видалення");
      }
      break;

    default:
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("405 Method Not Allowed");
  }
});

server.listen(port, host, () => {
  console.log(`🚀 Сервер запущено на http://${host}:${port}`);
});
