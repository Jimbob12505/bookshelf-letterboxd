import "~/styles/globals.css";

import type { Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { inter, playfairDisplay } from "~/lib/fonts";

export const metadata: Metadata = {
	title: "BookBound",
	description: "Your aesthetic bookshelf.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			className={`${inter.variable} ${playfairDisplay.variable}`}
			lang="en"
		>
			<body className="font-sans bg-parchment text-charcoal">
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
