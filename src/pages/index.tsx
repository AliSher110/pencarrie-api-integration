import type { NextPage } from "next";
import { useState } from "react";
import { Button } from "../components/Button";

export const Home: NextPage = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentData, setCurrentData] = useState<Record<string, string>[] | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [totalRecords, setTotalRecords] = useState(0);
	const [csvFilename, setCsvFilename] = useState<string | null>(null);

	const loadPage = async (page: number) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/products?page=${page}`);
			const data = await response.json();

			if (data.success && data.data) {
				setCurrentData(data.data);
				setCurrentPage(data.page || page);
				setTotalPages(data.totalPages || 0);
				setTotalRecords(data.totalRecords || 0);
				setCsvFilename(data.filename || "products.csv");
				
				console.log("📊 Products Data:", {
					page: data.page,
					totalPages: data.totalPages,
					totalRecords: data.totalRecords,
					recordsOnPage: data.data.length,
					filename: data.filename,
					data: data.data,
				});
			} else {
				setError(data.error || "Failed to fetch page");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch page");
			console.error("Page Error:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleFetchZip = async () => {
		setCurrentPage(1);
		setCurrentData(null);
		await loadPage(1);
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			loadPage(currentPage + 1);
		}
	};

	const handlePrevPage = () => {
		if (currentPage > 1) {
			loadPage(currentPage - 1);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
						Products Data
					</h1>
					<Button onClick={handleFetchZip}>
						{loading ? "Loading..." : "Fetch Products"}
					</Button>
					{error && (
						<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							Error: {error}
						</div>
					)}
					{currentData && totalRecords > 0 && (
						<div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
							✅ {totalRecords.toLocaleString()} records from {csvFilename}
							<div className="mt-2 text-sm">
								Page {currentPage} of {totalPages} ({currentData.length} records on this page)
							</div>
						</div>
					)}
					{totalPages > 1 && (
						<div className="mt-4 flex gap-2 flex-wrap items-center">
							<Button
								onClick={handlePrevPage}
								disabled={currentPage <= 1 || loading}
								className={(currentPage <= 1 || loading) ? "opacity-50 cursor-not-allowed" : ""}
							>
								← Previous
							</Button>
							<span className="px-4 text-gray-700 dark:text-gray-300">
								Page {currentPage} / {totalPages}
							</span>
							<Button
								onClick={handleNextPage}
								disabled={currentPage >= totalPages || loading}
								className={(currentPage >= totalPages || loading) ? "opacity-50 cursor-not-allowed" : ""}
							>
								Next →
							</Button>
						</div>
					)}
				</div>

				{currentData && (
					<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
						✅ Data loaded! Check browser console for details.
					</div>
				)}
			</div>
		</div>
	);
};

export default Home;
