import "~/styles/globals.css";

import type { Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { inter, playfairDisplay } from "~/lib/fonts";
import Navbar from "~/components/layout/Navbar";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
	title: "BookBound",
	description: "Your aesthetic bookshelf.",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const session = await auth();

	return (
		<html
			className={`${inter.variable} ${playfairDisplay.variable}`}
			lang="en"
		>
			<body className="font-sans bg-parchment text-charcoal min-h-screen">
				<Navbar session={session} />
				<div className="pt-24">
					<TRPCReactProvider>{children}</TRPCReactProvider>
				</div>
			</body>
		</html>
	);
}
