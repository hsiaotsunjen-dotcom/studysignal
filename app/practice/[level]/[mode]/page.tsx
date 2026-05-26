import { notFound } from "next/navigation";
import { ChatInterface } from "@/components/ChatInterface";
import { PictureTalk } from "@/components/PictureTalk";
import { ReadAloud } from "@/components/ReadAloud";
import { getMode, isSchoolLevel } from "@/lib/practice";

type PageProps = {
  params: Promise<{ level: string; mode: string }>;
};

export default async function ModePracticePage({ params }: PageProps) {
  const { level: levelSlug, mode: modeSlug } = await params;

  if (!isSchoolLevel(levelSlug)) {
    notFound();
  }

  const mode = getMode(levelSlug, modeSlug);
  if (!mode) {
    notFound();
  }

  if (mode.screen === "picture") {
    return <PictureTalk level={levelSlug} modeTitle={mode.title} />;
  }

  if (mode.screen === "read-aloud") {
    return <ReadAloud level={levelSlug} modeTitle={mode.title} />;
  }

  const showScoreLink = levelSlug === "high-school";

  return (
    <ChatInterface
      level={levelSlug}
      mode={mode}
      showScoreLink={showScoreLink}
    />
  );
}
