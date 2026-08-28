import type { Metadata } from "next";
import DivinationApp from "../DivinationApp";

export const metadata: Metadata = {
  title:"掌心观照｜观象",
  description:"在当前设备检查掌心照片的可见度，并获得一张不作命运推断的主题反思卡。",
};

export default function PalmPage() {
  return <DivinationApp key="palm" initialExperience="palm" />;
}
