import { glob } from "glob";

const distFiles = await glob("./dist/*.html");
const modules = await Promise.all(distFiles.map((file) => import("./" + file)));

const routes = distFiles.reduce(
  (acc, file, index) => {
    const path = file
      .replace("dist/", "/")
      .replace(/\.html$/, "")
      .replace(/\/index$/, "/");
    acc[path] = modules[index].default;
    return acc;
  },
  {} as Record<string, any>
);

Bun.serve({
  routes,
  development: true,
});
