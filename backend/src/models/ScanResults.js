const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
    id: { type: String, required: true },
    impact: { type: String, enum: ['minor', 'moderate', 'serious', 'critical'] },
    description: { type: String, required: true },
    help: { type: String },
    helpUrl: { type: String },
    target: [String], 

    aiExplanation: { type: String },
    aiCodeFix: { type: String }
});

const scanResultSchema = new mongoose.Schema({
    url: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    accessibilityScore: { type: Number, required: true }, 
    totalViolations: { type: Number, required: true },

    summary: {
        critical: { type: Number, default: 0 },
        serious: { type: Number, default: 0 },
        moderate: { type: Number, default: 0 },
        minor: { type: Number, default: 0 }
    },

    violations: [violationSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('ScanResult', scanResultSchema);