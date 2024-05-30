import Markdown from "react-markdown";

type ContentProps = {
  content: string;
  contentType?: "text/plain" | "text/markdown" | "text/html";
};

export function Content({ content, contentType = "text/plain" }: ContentProps) {
  switch (contentType) {
    case "text/markdown":
      return <Markdown>{content}</Markdown>;
    case "text/html":
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    default:
      return <pre className="text-pretty break-words">{content}</pre>;
  }
}
