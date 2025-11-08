import type { NextPage } from "next";

export const Home: NextPage = () => {
	return (
		<div className="h-[calc(100vh-64px)] flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
				<div className="text-center">
					<h1 className="text-4xl font-bold mb-4" style={{ color: '#000000' }}>
						Welcome
					</h1>
					<p className="text-lg" style={{ color: '#4B5563' }}>
						Welcome to the Pencarrie API Integration
					</p>
				</div>
			</div>
	);
};

export default Home;
