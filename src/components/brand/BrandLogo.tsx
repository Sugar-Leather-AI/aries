// The logo of whichever brand this build is (see src/brand). Shared pages
// (sign-in, legal) use these; brand-specific pages import their own logo.
import { PACK, type LogoProps, type MarkProps } from "@/brand/pack";
import { AriesLogo, AriesMark } from "./AriesLogo";

export const BrandLogo = (p: LogoProps) => (PACK.Logo ? <PACK.Logo {...p} /> : <AriesLogo {...p} />);
export const BrandMark = (p: MarkProps) => (PACK.Mark ? <PACK.Mark {...p} /> : <AriesMark {...p} />);
