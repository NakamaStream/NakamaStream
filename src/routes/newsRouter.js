const express = require("express");
const router = express.Router();
const db = require("../services/db");

// Middleware para verificar si el usuario es admin
const isAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        return next();
    }
    res.status(403).send("No autorizado");
};

// Ruta para mostrar todas las noticias
router.get("/news", (req, res) => {
    db.query("SELECT * FROM news ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).send("Error al obtener noticias");
        res.render("news/index", { 
            news: results, 
            isAdmin: req.session.isAdmin,
            username: req.session.username,
            profileImageUrl: req.session.profileImageUrl || '/uploads/placeholder-user.jpg'
        });
    });
});

// Ruta para mostrar el formulario de crear noticia
router.get("/news/create", isAdmin, (req, res) => {
    res.render("news/create", {
        username: req.session.username,
        profileImageUrl: req.session.profileImageUrl || '/uploads/placeholder-user.jpg'
    });
});

// Ruta para manejar la creación de una noticia
router.post("/news/create", isAdmin, (req, res) => {
    const { title, content, image } = req.body;
    if (!title || !content) {
        return res.status(400).send("Título y contenido son obligatorios.");
    }
    db.query("INSERT INTO news (title, content, image) VALUES (?, ?, ?)", [title, content, image], (err) => {
        if (err) return res.status(500).send("Error al crear noticia");
        res.redirect("/news");
    });
});

// Ruta para mostrar el formulario de editar una noticia
router.get("/news/edit/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM news WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).send("Noticia no encontrada");
        res.render("news/edit", { 
            news: results[0],
            username: req.session.username,
            profileImageUrl: req.session.profileImageUrl || '/uploads/placeholder-user.jpg'
        });
    });
});

// Ruta para manejar la actualización de una noticia
router.post("/news/edit/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const { title, content, image } = req.body;
    if (!title || !content) {
        return res.status(400).send("Título y contenido son obligatorios.");
    }
    db.query("UPDATE news SET title = ?, content = ?, image = ? WHERE id = ?", [title, content, image, id], (err) => {
        if (err) return res.status(500).send("Error al actualizar noticia");
        res.redirect("/news");
    });
});

// Ruta para mostrar una noticia individual
router.get("/news/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM news WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).send("Noticia no encontrada");
        res.render("news/show", { 
            news: results[0],
            username: req.session.username,
            profileImageUrl: req.session.profileImageUrl || '/uploads/placeholder-user.jpg'
        });
    });
});

// Ruta para eliminar una noticia
router.post("/news/delete/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM news WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).send("Error al eliminar noticia");
        res.redirect("/news");
    });
});

module.exports = router;