const { response, request } = require('express')
const Video = require('../models/video.model')

const videoCtrl = {}

videoCtrl.getAllvideos = async (req = request, res = response) => {
    const { limit = 10, from = 0} = req.query;
    const { id } = req.params;

    const [allVideo, video] = await Promise.all([
        Video.countDocuments({
            subCategory: id,
            estado: true 
        }).lean(),
        Video.find({
            subCategory: id,
            estado: true 
        })
            .populate('user', 'firstName')
            .populate('subCategory', 'name')
            .skip(Number(from))
            .limit(Number(limit)).lean()
    ])

    res.json({
        allVideo,
        video
    })
}

videoCtrl.getvideo = async (req = request, res = response) => {

    const { id } = req.params;
    const video = await Video.findById( id ).populate('user', 'firstName').populate('category', 'name').lean()


    res.json(video);

}

videoCtrl.createrVideo = async (req = request, res = response) => {
    const { estado, user, ...body } = req.body;

    const ProductDB = await Video.findOne({name: body.name})

    if( ProductDB ) {
        return res.status(400).json({
            msg: `La producto ${ProductDB.name}, ya existe`
        })
    }

    const data = {
        ...body,
        user: req.user._id,
        user: req.video._id,
    }

    const product = new Product(data)

    await product.save();

    res.status(201).json(product)

}

videoCtrl.updateproduct = async (req = request, res = response) => {

    const { id } = req.params;
    const { estado, user, ...data } = req.body;

    if ( data.name ) {
        data.name = data.name.toUpperCase();
    }

    data.user = req.user._id;

    const product = await Product.findByIdAndUpdate(id, data, { new: true })

    res.json(product);
}


videoCtrl.deletedproduct = async (req = request, res = response) => {

    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(id, {estado: false}, {new: true})

    res.json(product);

}

module.exports = videoCtrl