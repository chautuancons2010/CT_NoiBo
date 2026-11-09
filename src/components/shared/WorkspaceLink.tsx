"use client";

import Link from "next/link";
import {useState,type ComponentProps} from "react";

/** Warm only the route a person is about to open, rather than every visible module. */
export function WorkspaceLink({onPointerEnter,onFocus,onTouchStart,prefetch,...props}:ComponentProps<typeof Link>){
 const [intent,setIntent]=useState(false);
 return <Link {...props} prefetch={prefetch===undefined?intent:prefetch}
  onPointerEnter={event=>{onPointerEnter?.(event);if(!event.defaultPrevented)setIntent(true);}}
  onFocus={event=>{onFocus?.(event);if(!event.defaultPrevented)setIntent(true);}}
  onTouchStart={event=>{onTouchStart?.(event);if(!event.defaultPrevented)setIntent(true);}}/>;
}
