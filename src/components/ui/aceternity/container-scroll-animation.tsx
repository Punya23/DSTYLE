"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // The track is ~2 screens tall; the inner content is pinned (sticky) while you
  // scroll through it, so the tilt animates slowly over a long scroll — no void.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Dramatic recline that eases upright over the first ~85% of the pinned scroll,
  // then holds flat before releasing — slow, with real depth.
  const rotate = useTransform(scrollYProgress, [0, 0.85], isMobile ? [36, 0] : [50, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.85], isMobile ? [0.86, 1] : [1.2, 1]);
  const titleY = useTransform(scrollYProgress, [0, 0.85], [0, isMobile ? -50 : -140]);
  // Drift the card slightly UP as it flattens so it never crowds the section below.
  const cardY = useTransform(scrollYProgress, [0, 1], [0, isMobile ? -20 : -40]);

  return (
    <div ref={containerRef} className="relative h-[180vh] md:h-[230vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-4 pb-[12vh] md:pb-[14vh]">
        <div className="w-full" style={{ perspective: "1200px" }}>
          <Header translate={titleY} titleComponent={titleComponent} />
          <Card rotate={rotate} scale={scale} translate={cardY}>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => {
  return (
    <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  translate,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        translateY: translate,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="mx-auto mt-8 md:mt-12 h-[19rem] md:h-[32rem] w-full max-w-5xl rounded-[20px] border border-brand-ink/40 bg-brand-ink p-2 md:p-3 shadow-2xl"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-brand-ivory-deep">
        {children}
      </div>
    </motion.div>
  );
};
