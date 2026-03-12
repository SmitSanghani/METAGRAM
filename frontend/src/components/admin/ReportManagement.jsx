import React from 'react';
import { AlertCircle, CheckCircle, XCircle, User, Layout, MessageSquare } from 'lucide-react';

const mockReports = [
    { id: 'R-1', type: 'Spam', reporter: 'alex_j', target: '@smit.sanghani', date: '2 hours ago', severity: 'Low' },
    { id: 'R-2', type: 'Harassment', reporter: 'sarah_m', target: 'John Doe', date: '5 hours ago', severity: 'High' },
    { id: 'R-3', type: 'Inappropriate Content', reporter: 'detective_bot', target: 'Post #742', date: 'Yesterday', severity: 'Medium' },
];

const ReportManagement = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Reports & Violations</h1>
                <p className="text-sm text-gray-500">Handle flagged content and platform violations.</p>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-lg font-black text-gray-900">12 Pending Reports</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Requiring immediate attention</p>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {mockReports.map((report) => (
                        <div key={report.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400">
                                    <span className="font-bold text-xs">{report.id}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-black text-gray-900">{report.type}</h4>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                            report.severity === 'High' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {report.severity}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                                        <span className="flex items-center gap-1"><User size={12} /> {report.reporter}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span className="flex items-center gap-1"><Layout size={12} /> {report.target}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                        <span>{report.date}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all" title="Resolve">
                                    <CheckCircle size={20} />
                                </button>
                                <button className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all" title="Dismiss">
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportManagement;
