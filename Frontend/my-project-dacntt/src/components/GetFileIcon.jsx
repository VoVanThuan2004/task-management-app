// Helper functions
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
//   const iconClass = "w-4 h-4 text-gray-600";
  
  switch (ext) {
    case 'pdf':
      return <span className="text-red-500 font-bold text-xs">PDF</span>;
    case 'doc':
    case 'docx':
      return <span className="text-blue-500 font-bold text-xs">DOC</span>;
    case 'xls':
    case 'xlsx':
      return <span className="text-green-500 font-bold text-xs">XLS</span>;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <span className="text-purple-500 font-bold text-xs">IMG</span>;
    case 'zip':
    case 'rar':
      return <span className="text-yellow-500 font-bold text-xs">ZIP</span>;
    default:
      return <span className="text-gray-500 font-bold text-xs">FILE</span>;
  }
};

export default getFileIcon;