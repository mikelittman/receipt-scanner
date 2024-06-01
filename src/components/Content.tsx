import Markdown from "react-markdown";

type ContentProps = {
  content: string | React.ReactNode;
  contentType?: "text/plain" | "text/markdown" | "text/html";
};

export function Content({ content, contentType = "text/plain" }: ContentProps) {
  if (typeof content !== "string") return content;

  switch (contentType) {
    case "text/markdown":
      return <Markdown>{content}</Markdown>;
    case "text/html":
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    default:
      return <pre className="text-pretty break-words">{content}</pre>;
  }
}
