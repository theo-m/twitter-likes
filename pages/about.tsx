import Link from "next/link";
import * as React from "react";

export default function About() {
  return (
    <div className="w-screen h-screen flex flex-col p-4 gap-16 items-center">
      <p className="prose sm:w-[480px]">
        This is a personal tiny tool to be able to browse the tweets I&apos;ve
        personally liked.
        <br />
        The API key is subjected to a 75 query / 15min quota, which is quickly
        running out.
        <br />
        Almost everything happens in the browser: queries are cached and search
        happens thanks to fuse.js.
        <br />
        Feel free to{" "}
        <a
          href="https://github.com/theo-m/twitter-likes"
          target="_blank"
          rel="noreferrer"
        >
          fork the project
        </a>{" "}
        to use it on your own.
      </p>
      <div>
        <Link href="/">
          <a>Back</a>
        </Link>
      </div>
    </div>
  );
}
