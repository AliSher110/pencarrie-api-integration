import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { LoadingBar } from "../components/LoadingBar";
import { Navbar } from "../components/Navbar";

export const Home: NextPage = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentData, setCurrentData] = useState<Record<string, string>[] | null>(null);
	const [filteredData, setFilteredData] = useState<Record<string, string>[] | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [totalRecords, setTotalRecords] = useState(0);
	const [csvFilename, setCsvFilename] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [tableHeaders, setTableHeaders] = useState<string[]>([]);
	const [allHeaders, setAllHeaders] = useState<string[]>([]);
	const [perPage, setPerPage] = useState(500);
	const [pageSize, setPageSize] = useState(500);

	const displayFields = [
		'Front Image',
		'Title',
		'﻿SKU',
		'Single List Price',
		'Type',
		'Brand',
		'Supplier Code'
	];

	const loadPage = async (page: number, itemsPerPage: number = perPage) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/products?page=${page}&perPage=${itemsPerPage}`);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.success && data.data) {
				setCurrentData(data.data);
				setFilteredData(data.data);
				setCurrentPage(data.page || page);
				setTotalPages(data.totalPages || 0);
				setTotalRecords(data.totalRecords || 0);
				setPageSize(data.pageSize || itemsPerPage);
				setCsvFilename(data.filename || "products.csv");

				if (data.data.length > 0) {
					const allKeys = Object.keys(data.data[0]);
					setAllHeaders(allKeys);

					const orderedHeaders = displayFields
						.map(field => {
							let found = allKeys.find(key => key === field);
							if (found) return found;

							found = allKeys.find(key => key.toLowerCase().trim() === field.toLowerCase().trim());
							if (found) return found;

							if (field.includes('SKU')) {
								found = allKeys.find(key => key.replace(/^\uFEFF/, '').toLowerCase().trim() === 'sku');
								if (found) return found;
							}

							return null;
						})
						.filter(Boolean) as string[];

					setTableHeaders(orderedHeaders);
				}
			} else {
				setError(data.error || "Failed to fetch page");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch page");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		setCurrentPage(1);
		loadPage(1, perPage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [perPage]);

	// Filter data based on search query
	useEffect(() => {
		if (!currentData) return;

		if (!searchQuery.trim()) {
			setFilteredData(currentData);
			return;
		}

		const filtered = currentData.filter((row) => {
			return Object.values(row).some((value) =>
				value.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});
		setFilteredData(filtered);
	}, [searchQuery, currentData]);

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			loadPage(currentPage + 1, perPage);
			setSearchQuery("");
		}
	};

	const handlePrevPage = () => {
		if (currentPage > 1) {
			loadPage(currentPage - 1, perPage);
			setSearchQuery("");
		}
	};

	const getStartIndex = () => {
		return (currentPage - 1) * pageSize + 1;
	};

	const getEndIndex = () => {
		if (!filteredData) return 0;
		return (currentPage - 1) * pageSize + filteredData.length;
	};

	const formatHeader = (header: string): string => {
		const cleanHeader = header.replace(/^\uFEFF/, '').trim();
		const lowerHeader = cleanHeader.toLowerCase();

		const fieldMap: Record<string, string> = {
			'front image': 'Image',
			'title': 'Name',
			'sku': 'SKU',
			'single list price': 'Price',
			'type': 'Category',
			'brand': 'Brand',
			'supplier code': 'Supplier Code'
		};

		if (fieldMap[lowerHeader]) {
			return fieldMap[lowerHeader];
		}

		return cleanHeader
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (str) => str.toUpperCase())
			.trim();
	};

	const isImageField = (header: string): boolean => {
		const cleanHeader = header.replace(/^\uFEFF/, '').trim();
		const lowerHeader = cleanHeader.toLowerCase();
		return lowerHeader === 'front image';
	};

	const isPriceField = (header: string): boolean => {
		const cleanHeader = header.replace(/^\uFEFF/, '').trim();
		const lowerHeader = cleanHeader.toLowerCase();
		return lowerHeader === 'single list price';
	};

	const formatPrice = (value: string | undefined): string => {
		if (!value) return "-";
		const numValue = parseFloat(value);
		if (isNaN(numValue)) return value;
		return `${numValue.toFixed(2)}`;
	};

	return (
		<>
			<LoadingBar loading={loading} />
			<Navbar pages={[{ name: "Products", href: "/", current: true }]} />
			<div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
				<div className="w-full px-4 md:px-6 lg:px-8 pt-4 pb-2 flex-shrink-0">
					<div className="w-full flex justify-between items-center mb-3 mt-1 pl-3">
						<div>
						<h3 className="text-xl font-medium" style={{ color: '#000000', fontSize: '20px' }}>Products</h3>
						<p className="text-xs uppercase tracking-wide" style={{ color: '#4B5563', fontSize: '12px', letterSpacing: '0.05em' }}>Overview of all products</p>
					</div>
					<div className="ml-3">
						<div className="w-full max-w-sm min-w-[200px] relative">
							<div className="relative">
								<input
									className="w-full pr-11 h-10 pl-3 py-2 text-sm rounded transition duration-200 ease focus:outline-none shadow-sm focus:shadow-md"
									style={{ 
										backgroundColor: '#FFFFFF',
										color: '#000000',
										borderColor: '#E5E7EB',
										borderWidth: '1px'
									}}
									placeholder="Search for product..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onFocus={(e) => e.target.style.borderColor = '#7C3AED'}
									onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
								/>
								<button
									className="absolute h-8 w-8 right-1 top-1 my-auto px-2 flex items-center rounded"
									style={{ backgroundColor: '#FFFFFF' }}
									type="button"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={3}
										stroke="currentColor"
										className="w-8 h-8"
										style={{ color: '#4B5563' }}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
										/>
									</svg>
								</button>
							</div>
						</div>
					</div>
					</div>
				</div>

				{error && (
					<div className="px-4 md:px-6 lg:px-8 pb-2 flex-shrink-0">
						<div className="p-4 rounded-lg" style={{ 
							backgroundColor: '#FFFFFF', 
							borderColor: '#E5E7EB', 
							borderWidth: '1px', 
							color: '#EF4444',
							boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
							borderRadius: '8px'
						}}>
							Error: {error}
						</div>
					</div>
				)}

				{loading && !currentData && (
					<div className="px-4 md:px-6 lg:px-8 pb-2 flex-shrink-0">
						<div className="p-4 rounded-lg" style={{ 
							backgroundColor: '#FFFFFF', 
							borderColor: '#E5E7EB', 
							borderWidth: '1px', 
							color: '#7C3AED',
							boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
							borderRadius: '8px'
						}}>
							Loading products...
						</div>
					</div>
				)}

				<div className="flex-1 min-h-0 px-4 md:px-6 lg:px-8 pb-2 overflow-hidden flex flex-col">
					{filteredData && filteredData.length > 0 && (
						<div className="relative flex flex-col w-full h-full rounded-lg bg-clip-border" style={{ 
							backgroundColor: '#FFFFFF',
							boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
							borderRadius: '8px'
						}}>
						<div className="overflow-y-auto flex-1 hide-scrollbar">
							<table className="w-full text-left table-auto">
							<thead className="sticky top-0 z-10">
								<tr>
									{tableHeaders.map((header) => (
										<th
											key={header}
											className="px-3 py-2 border-b"
											style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}
										>
											<p className="text-s leading-none whitespace-nowrap" style={{ color: '#7C3AED', fontWeight: 600 }}>
												{formatHeader(header)}
											</p>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{filteredData.map((row, index) => (
									<tr
										key={index}
										className="border-b"
										style={{ 
											borderColor: '#E5E7EB',
											backgroundColor: index % 2 === 1 ? 'rgba(124, 58, 237, 0.03)' : 'transparent'
										}}
										onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)'}
										onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 1 ? 'rgba(124, 58, 237, 0.03)' : 'transparent'}
									>
										{tableHeaders.map((header) => (
											<td key={header} className="px-3 py-2">
												{isImageField(header) && row[header] ? (
													<div className="flex items-center">
														<img 
															src={row[header]} 
															alt="Product" 
															className="w-12 h-12 object-cover rounded"
															onError={(e) => {
																const target = e.target as HTMLImageElement;
																target.style.display = 'none';
															}}
														/>
													</div>
												) : isPriceField(header) ? (
													<p className="text-xs truncate max-w-xs" style={{ color: '#000000' }}>
														{formatPrice(row[header])}
													</p>
												) : (
													<p className="text-xs truncate max-w-xs" style={{ color: '#000000' }}>
														{row[header] || "-"}
													</p>
												)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
						</div>

						<div className="flex justify-between items-center px-4 py-3 mt-2" style={{ borderTopColor: '#E5E7EB', borderTopWidth: '1px' }}>
							<div className="text-sm" style={{ color: '#4B5563' }}>
								Showing <b style={{ color: '#000000' }}>{getStartIndex()}-{getEndIndex()}</b> of {totalRecords.toLocaleString()} 
								{totalPages > 0 && (
									<span> (Page <b style={{ color: '#000000' }}>{currentPage}</b> of <b style={{ color: '#000000' }}>{totalPages}</b>)</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<div className="flex items-center gap-2">
									<select
										value={perPage}
										onChange={(e) => setPerPage(Number(e.target.value))}
										className="px-3 py-1 min-w-20 min-h-9 text-sm font-normal rounded transition duration-200 ease focus:outline-none"
										style={{ 
											backgroundColor: '#FFFFFF',
											color: '#000000',
											borderColor: '#E5E7EB',
											borderWidth: '1px',
											cursor: 'pointer',
											appearance: 'none',
											backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234B5563' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
											backgroundRepeat: 'no-repeat',
											backgroundPosition: 'right 8px center',
											paddingRight: '32px'
										}}
										onFocus={(e) => e.target.style.borderColor = '#7C3AED'}
										onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
										onMouseEnter={(e) => {
											e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
											e.currentTarget.style.borderColor = '#7C3AED';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.backgroundColor = '#FFFFFF';
											e.currentTarget.style.borderColor = '#E5E7EB';
										}}
									>
										<option value={500}>500</option>
										<option value={1000}>1000</option>
										<option value={2000}>2000</option>
										<option value={5000}>5000</option>
									</select>
								</div>
								<div className="flex space-x-1">
								<button
									onClick={handlePrevPage}
									disabled={currentPage <= 1 || loading}
									className="px-3 py-1 min-w-9 min-h-9 text-sm font-normal rounded transition duration-200 ease"
									style={{
										backgroundColor: '#FFFFFF',
										borderColor: '#E5E7EB',
										borderWidth: '1px',
										color: currentPage <= 1 || loading ? '#9CA3AF' : '#000000',
										cursor: currentPage <= 1 || loading ? 'not-allowed' : 'pointer',
										opacity: currentPage <= 1 || loading ? 0.5 : 1
									}}
									onMouseEnter={(e) => {
										if (currentPage > 1 && !loading) {
											e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
											e.currentTarget.style.borderColor = '#7C3AED';
											e.currentTarget.style.color = '#7C3AED';
										}
									}}
									onMouseLeave={(e) => {
										if (currentPage > 1 && !loading) {
											e.currentTarget.style.backgroundColor = '#FFFFFF';
											e.currentTarget.style.borderColor = '#E5E7EB';
											e.currentTarget.style.color = '#000000';
										}
									}}
								>
									Prev
								</button>
								{Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
									let pageNum;
									if (totalPages <= 10) {
										pageNum = i + 1;
									} else if (currentPage <= 5) {
										pageNum = i + 1;
									} else if (currentPage >= totalPages - 4) {
										pageNum = totalPages - 9 + i;
									} else {
										pageNum = currentPage - 5 + i;
									}
									const isActive = currentPage === pageNum;
									return (
										<button
											key={pageNum}
											onClick={() => {
												loadPage(pageNum, perPage);
												setSearchQuery("");
											}}
											disabled={loading}
											className="px-3 py-1 min-w-9 min-h-9 text-sm font-normal border rounded transition duration-200 ease"
											style={{
												backgroundColor: isActive ? '#7C3AED' : '#FFFFFF',
												borderColor: isActive ? '#7C3AED' : '#E5E7EB',
												borderWidth: '1px',
												color: isActive ? '#FFFFFF' : '#000000'
											}}
											onMouseEnter={(e) => {
												if (!isActive) {
													e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
													e.currentTarget.style.borderColor = '#7C3AED';
													e.currentTarget.style.color = '#7C3AED';
												} else {
													e.currentTarget.style.backgroundColor = '#6D28D9';
												}
											}}
											onMouseLeave={(e) => {
												if (!isActive) {
													e.currentTarget.style.backgroundColor = '#FFFFFF';
													e.currentTarget.style.borderColor = '#E5E7EB';
													e.currentTarget.style.color = '#000000';
												} else {
													e.currentTarget.style.backgroundColor = '#7C3AED';
												}
											}}
										>
											{pageNum}
										</button>
									);
								})}
								<button
									onClick={handleNextPage}
									disabled={currentPage >= totalPages || loading}
									className="px-3 py-1 min-w-9 min-h-9 text-sm font-normal rounded transition duration-200 ease"
									style={{
										backgroundColor: '#FFFFFF',
										borderColor: '#E5E7EB',
										borderWidth: '1px',
										color: currentPage >= totalPages || loading ? '#9CA3AF' : '#000000',
										cursor: currentPage >= totalPages || loading ? 'not-allowed' : 'pointer',
										opacity: currentPage >= totalPages || loading ? 0.5 : 1
									}}
									onMouseEnter={(e) => {
										if (currentPage < totalPages && !loading) {
											e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
											e.currentTarget.style.borderColor = '#7C3AED';
											e.currentTarget.style.color = '#7C3AED';
										}
									}}
									onMouseLeave={(e) => {
										if (currentPage < totalPages && !loading) {
											e.currentTarget.style.backgroundColor = '#FFFFFF';
											e.currentTarget.style.borderColor = '#E5E7EB';
											e.currentTarget.style.color = '#000000';
										}
									}}
								>
									Next
								</button>
								</div>
							</div>
						</div>
					</div>
					)}

					{filteredData && filteredData.length === 0 && !loading && (
						<div className="p-4 rounded-lg" style={{ 
							backgroundColor: '#FFFFFF', 
							borderColor: '#E5E7EB', 
							borderWidth: '1px', 
							color: '#4B5563',
							boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
							borderRadius: '8px'
						}}>
							No products found{searchQuery ? ` matching "${searchQuery}"` : ""}.
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default Home;
