import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import { dirname, basename } from "path";

const processor = remark().use(remarkFrontmatter).use(remarkGfm).use(remarkHtml);

const template = readFileSync("./src/layouts/base.html", "utf8");

async function buildPages() {
  const files = await glob("./src/content/**/*.md");
  const cssFiles = await glob("./src/styles/**/*.css");

  await Promise.all(files.concat(cssFiles).map((file) => import("./" + file))); // dynamic import for watch dependency

  if (!existsSync("./dist")) {
    mkdirSync("./dist", { recursive: true });
  }

  // Copy CSS files
  cpSync("./src/styles", "./dist/styles", { recursive: true });

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const { data, content: markdown } = matter(content);

    const html = await processor.process(markdown);

    const outputPath = file.replace("src/content/", "dist/").replace(/\.md$/, ".html");

    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    let page: string = "";

    if (basename(file) === "index.md") {
      const navLinks = files
        .filter((f) => !f.includes("index."))
        .map((f) => {
          const pageContent = readFileSync(f, "utf8");
          const { data: pageData } = matter(pageContent);
          const link = f.replace("src/content/", "/").replace(/\.md$/, "");
          return `<li><a href="${link}">${
            pageData.title || basename(f).replace(/\.md?$/, "")
          }</a></li>`;
        })
        .join("\n        ");

      const homeContent = `<ul class="nav-list">\n        ${navLinks}\n      </ul>`;

      page = template
        .replace("{{title}}", "neil song")
        .replace("{{content}}", homeContent);
    } else {
      page = template
        .replace("{{title}}", (data.title as string) || "Page")
        .replace("{{content}}", html.toString());
    }

    if (existsSync(outputPath)) {
      const oldPage = readFileSync(outputPath, "utf8");
      if (oldPage === page) {
        continue;
      }
    }

    writeFileSync(outputPath, page);

    console.log(`Built: ${outputPath}`);
  }
}

try {
  await buildPages();
} catch (error) {
  console.error(error);
}
